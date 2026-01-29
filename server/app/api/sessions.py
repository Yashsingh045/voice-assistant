from fastapi import APIRouter, HTTPException
from app.services.session_service import SessionService
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/sessions", tags=["sessions"])
service = SessionService()

@router.on_event("startup")
async def startup():
    await service.connect()

@router.on_event("shutdown")
async def shutdown():
    await service.disconnect()

@router.post("/")
async def create_session():
    """Create new session"""
    session = await service.create_session()
    return {"id": session.id, "title": session.title}

@router.get("/")
async def get_sessions():
    """Get all sessions"""
    sessions = await service.get_all_sessions()
    result = []
    for s in sessions:
        # Format creation date
        created_date = s.createdAt
        now = datetime.now(created_date.tzinfo) if created_date.tzinfo else datetime.now()
        
        # Calculate time difference
        diff = now - created_date
        days = diff.days
        
        if days == 0:
            # Today
            time_str = created_date.strftime("Today at %I:%M %p")
        elif days == 1:
            # Yesterday
            time_str = created_date.strftime("Yesterday at %I:%M %p")
        elif days < 7:
            # This week
            time_str = created_date.strftime("%A at %I:%M %p")
        else:
            # Older
            time_str = created_date.strftime("%b %d, %Y")
        
        result.append({
            "id": s.id,
            "title": s.title,
            "created_at": s.createdAt.isoformat(),
            "created_at_display": time_str,
            "message_count": s._count.messages
        })
    return result

@router.get("/{session_id}/messages")
async def get_messages(session_id: str):
    """Get session messages"""
    # Validate session_id format
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id format")
    
    try:
        messages = await service.get_session_messages(session_id)
        return [
            {
                "text": m.text,
                "is_user": m.isUser,
                "timestamp": m.timestamp.isoformat()
            }
            for m in messages
        ]
    except Exception as e:
        raise HTTPException(status_code=404, detail="Session not found")

@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """Delete session"""
    # Validate session_id format
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id format")
    
    try:
        await service.delete_session(session_id)
        return {"message": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=404, detail="Session not found")
