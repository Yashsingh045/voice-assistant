from prisma import Prisma
from typing import List, Dict
from datetime import datetime

class SessionService:
    def __init__(self):
        self.prisma = Prisma()
    
    async def connect(self):
        await self.prisma.connect()
    
    async def disconnect(self):
        await self.prisma.disconnect()
    
    async def create_session(self, device_id: str = None):
        """Create new session with optional device ID"""
        data = {}
        if device_id:
            data['deviceId'] = device_id
        return await self.prisma.session.create(data=data)
    
    async def get_sessions_by_device(self, device_id: str):
        """Get all sessions for a specific device, newest first"""
        sessions = await self.prisma.session.find_many(
            where={'deviceId': device_id},
            order={'updatedAt': 'desc'}
        )
        # Manually count messages for each session
        for session in sessions:
            message_count = await self.prisma.message.count(
                where={'sessionId': session.id}
            )
            session._count = type('obj', (object,), {'messages': message_count})()
        return sessions
    
    async def get_all_sessions(self):
        """Get all sessions, newest first"""
        sessions = await self.prisma.session.find_many(
            order={'updatedAt': 'desc'}
        )
        # Manually count messages for each session
        for session in sessions:
            message_count = await self.prisma.message.count(
                where={'sessionId': session.id}
            )
            session._count = type('obj', (object,), {'messages': message_count})()
        return sessions
    
    async def get_session_messages(self, session_id: str):
        """Get all messages for a session"""
        return await self.prisma.message.find_many(
            where={'sessionId': session_id},
            order={'timestamp': 'asc'}
        )
    
    async def add_message(self, session_id: str, text: str, is_user: bool):
        """Add message to session"""
        await self.prisma.message.create(
            data={'sessionId': session_id, 'text': text, 'isUser': is_user}
        )
        # Update session timestamp with current datetime
        await self.prisma.session.update(
            where={'id': session_id},
            data={'updatedAt': datetime.utcnow()}
        )
    
    async def auto_title(self, session_id: str):
        """Auto-generate title from first message"""
        messages = await self.get_session_messages(session_id)
        if messages and len(messages) >= 1:
            first_msg = next((m for m in messages if m.isUser), None)
            if first_msg:
                # Extract first 50 characters for better title
                title = first_msg.text[:50].strip()
                if len(first_msg.text) > 50:
                    title += '...'
                await self.prisma.session.update(
                    where={'id': session_id},
                    data={'title': title}
                )
    
    async def delete_session(self, session_id: str):
        """Delete session"""
        await self.prisma.session.delete(where={'id': session_id})
