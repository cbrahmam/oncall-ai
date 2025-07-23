from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.services.team_service import TeamService
from app.schemas.team import TeamCreate, TeamResponse, TeamMemberResponse

router = APIRouter()

@router.get("/test")
async def test_teams():
    """Test endpoint"""
    return {"message": "Teams endpoint is working!"}

@router.post("/", response_model=TeamResponse)
async def create_team(
    team_data: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Create a new team"""
    service = TeamService(db)
    team = await service.create_team_simple(
        team_data=team_data,
        organization_id=str(current_user.organization_id),
        creator_id=str(current_user.id)
    )
    
    # Get user data safely without async issues
    user_id = str(current_user.id)
    user_email = current_user.email
    user_name = current_user.full_name
    
    return {
        "id": str(team.id),
        "name": team.name,
        "description": team.description,
        "is_active": team.is_active,
        "member_count": 1,
        "members": [
            {
                "id": user_id,
                "full_name": user_name,
                "email": user_email,
                "role": "lead",
                "joined_at": team.created_at,
                "is_currently_on_call": False
            }
        ],
        "created_at": team.created_at
    }

@router.get("/", response_model=List[TeamResponse])
async def list_teams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """List all teams in organization"""
    service = TeamService(db)
    teams = await service.list_teams_simple(str(current_user.organization_id))
    
    return [
        {
            "id": str(team.id),
            "name": team.name,
            "description": team.description,
            "is_active": team.is_active,
            "member_count": 1,  # We'll improve this later
            "members": [],      # We'll improve this later
            "created_at": team.created_at
        } for team in teams
    ]