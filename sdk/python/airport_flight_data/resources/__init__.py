"""API resource modules"""

from .flights import FlightsResource
from .airports import AirportsResource
from .statistics import StatisticsResource
from .export import ExportResource
from .batch import BatchResource
from .webhooks import WebhooksResource
from .websocket import WebSocketResource

__all__ = [
    "FlightsResource",
    "AirportsResource",
    "StatisticsResource",
    "ExportResource",
    "BatchResource",
    "WebhooksResource",
    "WebSocketResource"
]