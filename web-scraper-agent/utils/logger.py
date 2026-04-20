"""
Logging utility
"""

import logging

def setup_logger(name, log_file=None):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    return logger
