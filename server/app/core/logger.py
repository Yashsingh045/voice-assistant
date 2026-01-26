import logging
import sys
import os
from pythonjsonlogger import jsonlogger
from logging.handlers import RotatingFileHandler

def setup_logging():
    logger = logging.getLogger()
    
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    
    # Stream Handler (Stdout)
    logHandler = logging.StreamHandler(sys.stdout)
    
    # File Handler (Rotating)
    fileHandler = RotatingFileHandler(
        "logs/app.log", 
        maxBytes=10*1024*1024, # 10MB
        backupCount=5
    )
    
    formatter = jsonlogger.JsonFormatter(
        '%(timestamp)s %(levelname)s %(name)s %(message)s',
        timestamp=True
    )
    
    logHandler.setFormatter(formatter)
    fileHandler.setFormatter(formatter)
    
    logger.addHandler(logHandler)
    logger.addHandler(fileHandler)
    logger.setLevel(logging.INFO)
    
    # Silence verbose libraries
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("deepgram").setLevel(logging.INFO)
