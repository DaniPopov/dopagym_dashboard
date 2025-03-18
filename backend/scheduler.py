import logging
import traceback
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from mongo_db import MongoOrYehuda

logger = logging.getLogger(__name__)

class AccountStatusScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.db = MongoOrYehuda()

    def start(self):
        """Start the scheduler with defined jobs"""
        # Run at specified times for testing
        self.scheduler.add_job(
            self._run_payment_status_update,  # Use wrapper function
            CronTrigger(hour=00, minute=00),
            id="update_payment_status",
            replace_existing=True
        )

        self.scheduler.add_job(
            self._run_inactive_accounts_update,  # Use wrapper function
            CronTrigger(hour=00, minute=10),
            id="update_inactive_accounts",
            replace_existing=True
        )

        self.scheduler.start()
        logger.info("✅ Account status scheduler started")

    def _run_payment_status_update(self):
        """Wrapper to run the async payment status update"""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self.update_payment_status())
        loop.close()

    def _run_inactive_accounts_update(self):
        """Wrapper to run the async inactive accounts update"""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self.update_inactive_accounts())
        loop.close()

    async def update_payment_status(self):
        """Update payment status for cash payments one day after expiration"""
        try:
            logger.info("⏰ Starting payment status update")
            members = await self.db.get_all_members()
            today = datetime.now()
            updated_count = 0
            
            for member in members:
                if member.get("paymentMethod") != "מזומן":
                    continue
                
                subscription_valid = member.get("subscriptionvalid")
                if not subscription_valid:
                    continue
                
                try:
                    if isinstance(subscription_valid, str):
                        subscription_date = datetime.fromisoformat(subscription_valid.replace('Z', '+00:00'))
                    else:
                        subscription_date = subscription_valid
                    
                    # Only mark as unpaid if subscription has expired
                    if subscription_date.date() < today.date():
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