"""
CredVerify — Transactional Email Service
Handles automated notifications for credential issuance and revocation.
Supports real SMTP (SendGrid, Mailgun, AWS SES, Gmail, etc.) with automatic
fallback to an in-memory/console development outbox if SMTP is not configured.
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import List, Dict, Optional

logger = logging.getLogger("credverify.email")

# In-memory storage of dispatched emails for inspection during development and testing
_sent_emails_store: List[Dict] = []
MAX_STORE_SIZE = 50

# Configuration from environment
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_TLS = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")
EMAIL_FROM = os.getenv("EMAIL_FROM", "CredVerify <no-reply@credverify.edu>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


def get_sent_emails(limit: int = 20) -> List[Dict]:
    """Retrieve the most recently dispatched emails."""
    return list(reversed(_sent_emails_store[-limit:]))


def clear_sent_emails() -> None:
    """Clear the stored email history."""
    _sent_emails_store.clear()


def _record_email(recipient: str, subject: str, html_body: str, text_body: str, status: str, error: Optional[str] = None):
    entry = {
        "id": len(_sent_emails_store) + 1,
        "recipient": recipient,
        "subject": subject,
        "html_body": html_body,
        "text_body": text_body,
        "sent_at": datetime.utcnow().isoformat() + "Z",
        "transport": "SMTP" if SMTP_HOST else "MOCK_CONSOLE",
        "status": status,
        "error": error,
    }
    _sent_emails_store.append(entry)
    if len(_sent_emails_store) > MAX_STORE_SIZE:
        _sent_emails_store.pop(0)


def _send_raw_email(recipient: str, subject: str, html_body: str, text_body: str) -> bool:
    """Dispatches email via configured SMTP, or logs to console if unconfigured."""
    if not SMTP_HOST:
        try:
            logger.info(
                f"[DEV EMAIL OUTBOX] To: {recipient} | Subject: {subject} | Status: DELIVERED_MOCK"
            )
        except Exception:
            pass
        _record_email(recipient, subject, html_body, text_body, status="DELIVERED_MOCK")
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = recipient

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        if SMTP_TLS:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                if SMTP_USER and SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(EMAIL_FROM, [recipient], msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                if SMTP_USER and SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(EMAIL_FROM, [recipient], msg.as_string())

        logger.info(f"Email successfully dispatched to {recipient} via SMTP {SMTP_HOST}")
        _record_email(recipient, subject, html_body, text_body, status="DELIVERED_SMTP")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {e}", exc_info=True)
        _record_email(recipient, subject, html_body, text_body, status="FAILED", error=str(e))
        return False


def send_credential_issued_email(
    student_email: str,
    student_name: str,
    credential_id: str,
    program_name: str,
    degree_type: str,
    institution_name: str,
    issue_date: str,
) -> bool:
    """Dispatches an official issuance alert to the student with wallet & verify links."""
    subject = f"🎓 [CredVerify] Academic Credential Issued: {program_name} ({credential_id})"
    verify_url = f"{FRONTEND_URL}/verify?id={credential_id}"
    wallet_url = f"{FRONTEND_URL}/wallet"

    text_body = f"""
Hello {student_name},

Congratulations! {institution_name} has officially issued your academic credential on the CredVerify network.

Credential Details:
- Credential ID: {credential_id}
- Degree / Program: {program_name} ({degree_type})
- Issued By: {institution_name}
- Issue Date: {issue_date}
- Status: ACTIVE / VERIFIED

You can access and share your verifiable degree anytime:
- Student Wallet: {wallet_url}
- Public Verification Badge: {verify_url}

Best regards,
{institution_name} & the CredVerify Team
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 32px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }}
    .header p {{ margin: 6px 0 0; font-size: 13px; opacity: 0.9; }}
    .content {{ padding: 32px 24px; }}
    .greeting {{ font-size: 16px; font-weight: 600; margin-bottom: 12px; }}
    .lead {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }}
    .badge {{ display: inline-block; padding: 4px 12px; background: #dcfce7; color: #166534; font-weight: 600; font-size: 12px; border-radius: 999px; margin-bottom: 16px; }}
    .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 28px; }}
    .card-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }}
    .card-row:last-child {{ border-bottom: none; }}
    .card-label {{ color: #64748b; font-weight: 500; }}
    .card-value {{ color: #0f172a; font-weight: 600; }}
    .btn-group {{ text-align: center; margin: 28px 0 16px; }}
    .btn {{ display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 13px; margin: 0 6px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }}
    .btn-secondary {{ background: #ffffff; color: #2563eb; border: 1px solid #bfdbfe; box-shadow: none; }}
    .footer {{ background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CredVerify Network</h1>
      <p>Tamper-Evident Academic Credential Infrastructure</p>
    </div>
    <div class="content">
      <div class="badge">Official Credential Issued</div>
      <div class="greeting">Hello {student_name},</div>
      <div class="lead">
        We are pleased to inform you that <strong>{institution_name}</strong> has officially issued and cryptographically recorded your academic degree on the CredVerify network.
      </div>
      <div class="card">
        <div class="card-row">
          <span class="card-label">Credential ID:</span>
          <span class="card-value" style="font-family: monospace;">{credential_id}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Program:</span>
          <span class="card-value">{program_name}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Degree Type:</span>
          <span class="card-value">{degree_type}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Issued By:</span>
          <span class="card-value">{institution_name}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Issue Date:</span>
          <span class="card-value">{issue_date}</span>
        </div>
      </div>
      <div class="btn-group">
        <a href="{wallet_url}" class="btn">View Student Wallet</a>
        <a href="{verify_url}" class="btn btn-secondary">Public Verification Page</a>
      </div>
    </div>
    <div class="footer">
      This credential was issued through an authorized institutional account on CredVerify.<br>
      Employers and third parties can scan the accompanying QR badge to verify authenticity in real-time.
    </div>
  </div>
</body>
</html>
"""
    return _send_raw_email(student_email, subject, html_body, text_body)


def send_credential_revoked_email(
    student_email: str,
    student_name: str,
    credential_id: str,
    program_name: str,
    institution_name: str,
    reason: str,
    revocation_date: str,
) -> bool:
    """Dispatches a revocation alert to the student with the official reason."""
    subject = f"⚠️ [CredVerify] Notice of Revocation: Credential {credential_id}"
    verify_url = f"{FRONTEND_URL}/verify?id={credential_id}"

    text_body = f"""
Hello {student_name},

This is an official notice that credential {credential_id} ({program_name}) has been revoked by {institution_name}.

Revocation Details:
- Credential ID: {credential_id}
- Program: {program_name}
- Revoked By: {institution_name}
- Date of Revocation: {revocation_date}
- Official Reason: {reason}

The public status of this credential is now REVOKED. Prospective employers checking this certificate will be informed that it is no longer valid.

If you believe this revocation was made in error, please contact the registrar or administration office at {institution_name}.

Best regards,
CredVerify Audit & Security Team
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #fecdd3; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #991b1b, #e11d48); padding: 32px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 22px; font-weight: 700; }}
    .header p {{ margin: 6px 0 0; font-size: 13px; opacity: 0.9; }}
    .content {{ padding: 32px 24px; }}
    .greeting {{ font-size: 16px; font-weight: 600; margin-bottom: 12px; }}
    .lead {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }}
    .badge {{ display: inline-block; padding: 4px 12px; background: #ffe4e6; color: #be123c; font-weight: 600; font-size: 12px; border-radius: 999px; margin-bottom: 16px; }}
    .card {{ background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 20px; margin-bottom: 24px; }}
    .card-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ffe4e6; font-size: 13px; }}
    .card-row:last-child {{ border-bottom: none; }}
    .card-label {{ color: #9f1239; font-weight: 500; }}
    .card-value {{ color: #881337; font-weight: 600; }}
    .footer {{ background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CredVerify Notice</h1>
      <p>Official Credential Revocation</p>
    </div>
    <div class="content">
      <div class="badge">Status: REVOKED</div>
      <div class="greeting">Hello {student_name},</div>
      <div class="lead">
        This is an official advisory that <strong>{institution_name}</strong> has updated the status of credential <strong style="font-family: monospace;">{credential_id}</strong> to <strong>REVOKED</strong>.
      </div>
      <div class="card">
        <div class="card-row">
          <span class="card-label">Credential ID:</span>
          <span class="card-value" style="font-family: monospace;">{credential_id}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Program:</span>
          <span class="card-value">{program_name}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Revoked By:</span>
          <span class="card-value">{institution_name}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Date:</span>
          <span class="card-value">{revocation_date}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Audit Reason:</span>
          <span class="card-value">{reason}</span>
        </div>
      </div>
      <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
        The public registry has been updated immediately. If you have questions regarding this administrative action, please contact the registrar office at {institution_name}.
      </div>
    </div>
    <div class="footer">
      CredVerify Audit Trail • Immutable Revocation Log
    </div>
  </div>
</body>
</html>
"""
    return _send_raw_email(student_email, subject, html_body, text_body)


def send_welcome_student_email(student_email: str, student_name: str) -> bool:
    """Dispatches a welcome email when a graduate registers."""
    subject = "🎓 [CredVerify] Welcome to Your Verifiable Credential Wallet"
    wallet_url = f"{FRONTEND_URL}/student"

    text_body = f"""
Hello {student_name},

Welcome to CredVerify! Your student profile is active.
Any academic degrees or verifiable certificates issued to {student_email} will automatically appear in your digital wallet.

Access your wallet: {wallet_url}

Best regards,
CredVerify Student Network
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px;">Welcome to CredVerify</h1>
      <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Secure Student Credential Infrastructure</p>
    </div>
    <div style="padding: 32px 24px;">
      <h3 style="margin-top: 0;">Hello {student_name},</h3>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Your graduate wallet account has been registered. Whenever universities and institutions issue credentials to <strong>{student_email}</strong>, they will be anchored to your account with tamper-evident cryptographic hashes and QR badges.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{wallet_url}" style="padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 13px;">Open Your Credential Wallet</a>
      </div>
    </div>
  </div>
</body>
</html>
"""
    return _send_raw_email(student_email, subject, html_body, text_body)


def send_institution_applied_email(contact_email: str, institution_name: str, admin_name: str) -> bool:
    """Notifies applicant that their institutional onboarding request is received and under review."""
    subject = f"🏛️ [CredVerify] Application Received: {institution_name}"

    text_body = f"""
Hello {admin_name},

Thank you for applying to onboard {institution_name} onto the CredVerify network.
Our platform compliance team is reviewing your institutional credentials and domain authority.
You will receive an update once your accreditation review is complete.

Best regards,
CredVerify Institutional Network
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px;">Application Received</h1>
      <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Institutional Onboarding & Accreditation Review</p>
    </div>
    <div style="padding: 32px 24px;">
      <h3 style="margin-top: 0;">Dear {admin_name},</h3>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        We have received the accreditation application for <strong>{institution_name}</strong>.
        Our security administrators verify domain authenticity before granting cryptographic certificate signing privileges.
      </p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px;">
        <strong>Status:</strong> <span style="color: #d97706; font-weight: 600;">PENDING PLATFORM REVIEW</span><br>
        <strong>Target Institution:</strong> {institution_name}<br>
        <strong>Primary Administrator:</strong> {contact_email}
      </div>
    </div>
  </div>
</body>
</html>
"""
    return _send_raw_email(contact_email, subject, html_body, text_body)


def send_institution_approved_email(contact_email: str, institution_name: str, admin_name: str) -> bool:
    """Dispatches welcome & activation notification when an institution is approved."""
    subject = f"✅ [CredVerify] Approved: {institution_name} is now an Authorized Issuer"
    login_url = f"{FRONTEND_URL}/login"

    text_body = f"""
Hello {admin_name},

Congratulations! {institution_name} has been vetted and approved on CredVerify.
Your administrator account is now active. You can log in to begin issuing tamper-evident credentials and inviting registrar staff.

Log in: {login_url}

Best regards,
CredVerify Compliance Administration
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px;">Accreditation Approved</h1>
      <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Authorized Academic Issuing Authority</p>
    </div>
    <div style="padding: 32px 24px;">
      <h3 style="margin-top: 0;">Congratulations {admin_name},</h3>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        <strong>{institution_name}</strong> has been officially approved. You now hold full privileges to issue verifiable academic credentials, upload cryptographic evidence, and invite staff members.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{login_url}" style="padding: 12px 24px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 13px;">Access Issuer Portal</a>
      </div>
    </div>
  </div>
</body>
</html>
"""
    return _send_raw_email(contact_email, subject, html_body, text_body)


def send_staff_invitation_email(
    staff_email: str,
    staff_name: str,
    institution_name: str,
    inviter_name: str,
    invite_token: str,
) -> bool:
    """Dispatches staff invitation link with registration token."""
    subject = f"📨 [CredVerify] Invitation to join {institution_name} as Credential Issuer"
    accept_url = f"{FRONTEND_URL}/register?invite={invite_token}"

    text_body = f"""
Hello {staff_name},

{inviter_name} has invited you to join {institution_name}'s academic credentialing team on CredVerify.
As an authorized issuer, you will be able to issue verifiable degrees and manage student certificates.

Accept your invitation and activate your account:
{accept_url}

Best regards,
{institution_name} Registrar & CredVerify
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px;">Staff Invitation</h1>
      <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Join {institution_name} on CredVerify</p>
    </div>
    <div style="padding: 32px 24px;">
      <h3 style="margin-top: 0;">Hello {staff_name},</h3>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        <strong>{inviter_name}</strong> has invited you to join the credential issuing team at <strong>{institution_name}</strong>.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{accept_url}" style="padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 13px;">Accept Staff Invitation</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
"""
    return _send_raw_email(staff_email, subject, html_body, text_body)

