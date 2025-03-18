import logging
import traceback
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from mongo_oryehuda import MongoOrYehuda
from mongo_batyam import MongoBatYam

logger = logging.getLogger(__name__)

class AccountStatusScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.db_oryehuda = MongoOrYehuda()
        self.db_batyam = MongoBatYam()  # Add Bat Yam database

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
        
        # Add job for Bat Yam payment status update
        self.scheduler.add_job(
            self._run_batyam_payment_status_update,  # New wrapper function
            CronTrigger(hour=00, minute=15),
            id="update_batyam_payment_status",
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
        
    def _run_batyam_payment_status_update(self):
        """Wrapper to run the async Bat Yam payment status update"""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self.update_batyam_payment_status())
        loop.close()

    async def update_payment_status(self):
        """Update payment status for cash payments one day after expiration"""
        try:
            logger.info("⏰ Starting payment status update")
            members = await self.db_oryehuda.get_all_members()
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
                        await self.db_oryehuda.update_member(
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
            members = await self.db_oryehuda.get_all_members()
            
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
                        await self.db_oryehuda.update_member(member["_id"], {"accountStatus": "frozen"})
                        frozen_count += 1
                        logger.info(f"🔒 Frozen account: {member['fullName']} (ID: {member['_id']})")
                except Exception as e:
                    logger.error(f"❌ Error processing last visit date for {member['_id']}: {e}")

            logger.info(f"⏰ Completed inactive accounts check. Froze {frozen_count} accounts.")

        except Exception as e:
            logger.error(f"❌ Error updating inactive accounts: {str(e)}")
            logger.error(f"❌ Error details: {traceback.format_exc()}")

    async def update_batyam_payment_status(self):
        """Update payment status for Bat Yam members based on payment date"""
        try:
            logger.info("⏰ Starting Bat Yam payment status update")
            members = await self.db_batyam.get_all_members()
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)  # Set to beginning of day
            updated_count = 0
            
            for member in members:
                if member.get("payment_method") != "מזומן":
                    continue
                
                payment_date = member.get("payment_date")
                if not payment_date:
                    continue
                
                try:
                    if isinstance(payment_date, str):
                        # Handle different date formats
                        try:
                            payment_date_obj = datetime.fromisoformat(payment_date.replace('Z', '+00:00'))
                        except ValueError:
                            # Try to parse DD/MM/YYYY format
                            if '/' in payment_date:
                                day, month, year = payment_date.split('/')
                                payment_date_obj = datetime(int(year), int(month), int(day))
                            else:
                                # Default ISO format
                                payment_date_obj = datetime.fromisoformat(payment_date)
                    else:
                        payment_date_obj = payment_date
                    
                    # Set to beginning of day for accurate comparison
                    payment_date_obj = payment_date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                    
                    # Only mark as unpaid if the payment date is strictly before today (not same day)
                    if payment_date_obj < today:
                        await self.db_batyam.update_member(
                            member["_id"],
                            {"payment_status": "unpaid"}
                        )
                        updated_count += 1
                        logger.info(f"💰 Updated Bat Yam payment status to unpaid for {member['fullName']}")
                    else:
                        # If same day or future date, ensure status is paid
                        if member.get("payment_status") != "paid":
                            await self.db_batyam.update_member(
                                member["_id"],
                                {"payment_status": "paid"}
                            )
                            updated_count += 1
                            logger.info(f"💰 Updated Bat Yam payment status to paid for {member['fullName']}")
                except Exception as e:
                    logger.error(f"❌ Error processing payment date for Bat Yam member {member['_id']}: {e}")
            
            logger.info(f"⏰ Completed Bat Yam payment status update. Updated {updated_count} payment statuses.")
            
        except Exception as e:
            logger.error(f"❌ Error updating Bat Yam payment status: {str(e)}")
            logger.error(f"❌ Error details: {traceback.format_exc()}")