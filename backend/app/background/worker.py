# backend/app/background/worker.py
import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import SessionLocal
from app.services.escalation_service import EscalationService

async def escalation_worker():
    """Background worker that checks for escalations every 5 minutes"""
    print("🚀 Escalation worker started")
    
    while True:
        try:
            async with SessionLocal() as db:
                print(f"⏰ Checking escalations at {datetime.now().strftime('%H:%M:%S')}")
                escalation_service = EscalationService(db)
                escalated = await escalation_service.check_incidents_for_escalation()
                
                if escalated:
                    print(f"⬆️ Escalated {len(escalated)} incidents: {escalated}")
                else:
                    print(f"✅ No escalations needed")
                    
        except Exception as e:
            print(f"❌ Escalation worker error: {e}")
            import traceback
            traceback.print_exc()
        
        # Wait 5 minutes before next check
        await asyncio.sleep(300)

async def start_background_workers():
    """Start all background workers"""
    tasks = [
        asyncio.create_task(escalation_worker()),
        # Add more workers here in future (cleanup, metrics, etc.)
    ]
    
    print("🔄 Starting background workers...")
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(start_background_workers())