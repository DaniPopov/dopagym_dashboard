import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import logging
import traceback


logger = logging.getLogger(__name__)

class EmailSender:
    def __init__(self, email, password):
        self.email = email
        self.password = password
        self.smtp_server = "smtp.gmail.com"  # Using Gmail SMTP server
        self.smtp_port = 587  # TLS port for Gmail

    def send_email(self, to, subject, body):
        try:
            # Create message container
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.email
            msg['To'] = to

            # Create the body of the message
            html_part = MIMEText(body, 'html')
            msg.attach(html_part)

            # Create SMTP connection
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()  # Enable TLS
                server.login(self.email, self.password)
                server.send_message(msg)

            logger.info(f"✅ Email sent successfully to {to}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to send email: {str(e)}")
            return False

    def send_welcome_email(self, to_email, member_name, barcode_image):
        try:
            msg = MIMEMultipart()
            msg['Subject'] = f'ברוך הבא ל-Dopamine Gym - {member_name}'
            msg['From'] = self.email
            msg['To'] = to_email

            # Create HTML content
            html_content = f"""
            <html dir="rtl">
                <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #333;">ברוך הבא ל-Dopamine Gym!</h2>
                        <p>שלום {member_name},</p>
                        <p>אנו שמחים לברך אותך על הצטרפותך למשפחת Dopamine Gym.</p>
                        <p>מצורף הברקוד האישי שלך:</p>
                        <img src="cid:qrcode" style="max-width: 300px;">
                        <p>הברקוד ישמש אותך בכניסה למכון.</p>
                        <p>לכל שאלה או בקשה, אנחנו כאן בשבילך.</p>
                        <br>
                        <p>בברכה,</p>
                        <p>צוות Dopamine Gym</p>
                    </div>
                </body>
            </html>
            """

            # Attach HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

            # Attach QR Code
            image = MIMEImage(barcode_image)
            image.add_header('Content-ID', '<qrcode>')
            msg.attach(image)

            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.email, self.password)
                server.send_message(msg)

            logger.info(f"✅ Welcome email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to send welcome email: {str(e)}")
            return False

