import logging
import traceback
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from mongo_db import MongoDB

logger = logging.getLogger(__name__)

class AccountStatusScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.db = MongoDB()

    def start(self):
        """Start the scheduler with defined jobs"""
        # Run at midnight every day for inactive accounts
        self.scheduler.add_job(
            self.update_inactive_accounts,
            CronTrigger(hour=0, minute=0),
            id="update_inactive_accounts",
            replace_existing=True
        )
        
        # Run at 1 AM every day for payment status
        self.scheduler.add_job(
            self.update_payment_status,
            CronTrigger(hour=1, minute=0),
            id="update_payment_status",
            replace_existing=True
        )

        self.scheduler.start()
        logger.info("✅ Account status scheduler started")

    async def update_inactive_accounts(self):
        """Freeze accounts of members who haven't visited in 10 days"""
        try:
            logger.info("⏰ Starting inactive accounts check")

            # Get all members
            members = await self.db.get_all_members()
            
            # Calculate the date 10 days ago
            ten_days_ago = datetime.now() - timedelta(days=10)

            # Track how many accounts were frozen
            frozen_count = 0

            # Process each member
            for member in members:
                # Skip if the member is already frozen
                if member.get("accountStatus") == "frozen":
                    continue

                # Check if the member has a last visit date
                last_visit = member.get("lastVisit")
                if not last_visit:
                    continue
                
                # Parse the date (handle both string and datetime objects)
                try:
                    if isinstance(last_visit, str):
                        last_visit_date = datetime.fromisoformat(last_visit.replace('Z', '+00:00'))
                    else:
                        last_visit_date = last_visit
                        
                    # If last visit was more than 10 days ago, freeze the account
                    if last_visit_date < ten_days_ago:
                        await self.db.update_member(member["_id"], {"accountStatus": "frozen"})
                        frozen_count += 1
                        logger.info(f"🔒 Frozen account: {member['fullName']} (ID: {member['_id']})")
                except Exception as e:
                    logger.error(f"❌ Error processing last visit date for {member['_id']}: {e}")

            logger.info(f"⏰ Completed inactive accounts check. Froze {frozen_count} accounts.")

        except Exception as e:
            logger.error(f"❌ Error updating inactive accounts: {str(e)}")
            logger.error(f"❌ Error details: {traceback.format_exc()}")

    async def update_payment_status(self):
        """Update payment status for cash payments one day after expiration"""
        try:
            logger.info("⏰ Starting payment status update")

            # Get all members
            members = await self.db.get_all_members()
            
            # Calculate yesterday's date
            yesterday = datetime.now() - timedelta(days=1)
            
            # Track how many payment statuses were updated
            updated_count = 0
            
            for member in members:
                # Only process cash payments
                if member.get("paymentMethod") != "מזומן":
                    continue
                
                # Check if subscription has expired
                subscription_valid = member.get("subscriptionvalid")
                if not subscription_valid:
                    continue
                
                try:
                    # Parse the date (handle both string and datetime objects)
                    if isinstance(subscription_valid, str):
                        subscription_date = datetime.fromisoformat(subscription_valid.replace('Z', '+00:00'))
                    else:
                        subscription_date = subscription_valid
                    
                    # If subscription expired yesterday
                    if subscription_date.date() == yesterday.date():
                        # Update payment status to unpaid
                        await self.db.update_member(
                            member["_id"], 
                            {"paymentStatus": "unpaid"}
                        )
                        updated_count += 1
                        logger.info(f"💰 Updated payment status to unpaid for {member['fullName']}")
                except Exception as e:
                    logger.error(f"❌ Error processing subscription date for {member['_id']}: {e}")
            
            logger.info(f"⏰ Completed payment status update. Updated {updated_count} payment statuses.")
            
        except Exception as e:
            logger.error(f"❌ Error updating payment status: {str(e)}")
            logger.error(f"❌ Error details: {traceback.format_exc()}")