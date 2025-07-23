from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum

class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AlertStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"

class AlertSource(str, Enum):
    DATADOG = "datadog"
    GRAFANA = "grafana"
    AWS_CLOUDWATCH = "aws_cloudwatch"
    NEW_RELIC = "new_relic"
    PAGERDUTY = "pagerduty"
    GENERIC = "generic"

# Generic webhook payload that works with any monitoring tool
class GenericAlertPayload(BaseModel):
    alert_id: str = Field(..., description="Unique alert identifier")
    title: str = Field(..., description="Alert title/summary")
    description: Optional[str] = Field(None, description="Detailed alert description")
    severity: AlertSeverity = Field(AlertSeverity.WARNING, description="Alert severity")
    status: AlertStatus = Field(AlertStatus.ACTIVE, description="Alert status")
    source: AlertSource = Field(AlertSource.GENERIC, description="Monitoring tool source")
    
    # Metadata
    service: Optional[str] = Field(None, description="Affected service")
    environment: Optional[str] = Field(None, description="Environment (prod, staging, etc)")
    region: Optional[str] = Field(None, description="Geographic region")
    tags: Optional[List[str]] = Field(default_factory=list, description="Alert tags")
    
    # Timing
    started_at: Optional[datetime] = Field(None, description="When alert started firing")
    resolved_at: Optional[datetime] = Field(None, description="When alert was resolved")
    
    # URLs and context
    alert_url: Optional[str] = Field(None, description="Link to alert in monitoring tool")
    runbook_url: Optional[str] = Field(None, description="Link to runbook/documentation")
    dashboard_url: Optional[str] = Field(None, description="Link to relevant dashboard")
    
    # Raw payload for debugging
    raw_payload: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Original webhook payload")

# Datadog-specific webhook payload
class DatadogAlertPayload(BaseModel):
    alert_id: str
    alert_type: str
    title: str
    body: Optional[str] = None
    priority: Optional[str] = None
    last_updated: Optional[str] = None
    event_type: str  # "triggered" or "resolved"
    link: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    aggreg_key: Optional[str] = None
    source_type_name: Optional[str] = None
    
    def to_generic(self) -> GenericAlertPayload:
        """Convert Datadog payload to generic format"""
        severity_map = {
            "P1": AlertSeverity.CRITICAL,
            "P2": AlertSeverity.ERROR,
            "P3": AlertSeverity.WARNING,
            "P4": AlertSeverity.INFO,
            "P5": AlertSeverity.INFO
        }
        
        status_map = {
            "triggered": AlertStatus.ACTIVE,
            "resolved": AlertStatus.RESOLVED
        }
        
        return GenericAlertPayload(
            alert_id=self.alert_id,
            title=self.title,
            description=self.body,
            severity=severity_map.get(self.priority, AlertSeverity.WARNING),
            status=status_map.get(self.event_type, AlertStatus.ACTIVE),
            source=AlertSource.DATADOG,
            tags=self.tags or [],
            alert_url=self.link,
            raw_payload=self.dict()
        )

# Grafana-specific webhook payload
class GrafanaAlertPayload(BaseModel):
    title: str
    ruleId: int
    ruleName: str
    state: str  # "alerting" or "ok"
    message: Optional[str] = None
    ruleUrl: Optional[str] = None
    evalMatches: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    tags: Optional[Dict[str, str]] = Field(default_factory=dict)
    
    def to_generic(self) -> GenericAlertPayload:
        """Convert Grafana payload to generic format"""
        status_map = {
            "alerting": AlertStatus.ACTIVE,
            "ok": AlertStatus.RESOLVED
        }
        
        # Extract severity from tags or use default
        severity = AlertSeverity.WARNING
        if self.tags and "severity" in self.tags:
            try:
                severity_value = self.tags["severity"].lower()
                if severity_value in ["critical"]:
                    severity = AlertSeverity.CRITICAL
                elif severity_value in ["error", "high"]:
                    severity = AlertSeverity.ERROR
                elif severity_value in ["warning", "medium"]:
                    severity = AlertSeverity.WARNING
                elif severity_value in ["info", "low"]:
                    severity = AlertSeverity.INFO
            except:
                pass
        
        return GenericAlertPayload(
            alert_id=str(self.ruleId),
            title=self.title,
            description=self.message,
            severity=severity,
            status=status_map.get(self.state, AlertStatus.ACTIVE),
            source=AlertSource.GRAFANA,
            tags=list(self.tags.values()) if self.tags else [],
            alert_url=self.ruleUrl,
            raw_payload=self.dict()
        )

# Alert processing result
class AlertProcessingResult(BaseModel):
    success: bool
    incident_id: Optional[str] = None
    incident_created: bool = False
    incident_updated: bool = False
    message: str
    alert_fingerprint: str
    
class AlertResponse(BaseModel):
    id: str
    organization_id: str
    alert_id: str
    title: str
    description: Optional[str]
    severity: AlertSeverity
    status: AlertStatus
    source: AlertSource
    fingerprint: str
    incident_id: Optional[str]
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    raw_payload: Dict[str, Any]

    class Config:
        from_attributes = True