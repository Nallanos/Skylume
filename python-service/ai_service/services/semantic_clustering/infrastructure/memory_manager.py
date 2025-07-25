"""
Memory management service for the semantic clustering pipeline.
Handles memory monitoring, garbage collection, and resource optimization.
"""

import gc
import psutil
import logging
from typing import Dict, Optional, Any


class MemoryManager:
    """Service responsible for memory management during clustering operations."""
    
    def __init__(self, memory_threshold_mb: int = 2048, gc_interval: int = 100):
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Memory thresholds and settings
        self.memory_threshold_mb = memory_threshold_mb
        self.gc_interval = gc_interval
        self.warning_threshold = 0.8
        
        # Operation tracking
        self._operation_count = 0
        
        self.logger.info(f"💾 MemoryManager initialized with {self.memory_threshold_mb}MB threshold")
    
    def check_memory_usage(self) -> Dict[str, float]:
        """Monitor current memory usage."""
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024  # Convert to MB
            
            memory_stats = {
                'current_mb': memory_mb,
                'percent': process.memory_percent(),
                'threshold_mb': self.memory_threshold_mb
            }
            
            # Log warning if memory usage is high
            if memory_mb > self.memory_threshold_mb:
                self.logger.warning(f"🚨 High memory usage: {memory_mb:.1f}MB (>{self.memory_threshold_mb}MB threshold)")
            
            return memory_stats
        except Exception as e:
            self.logger.debug(f"Failed to check memory usage: {e}")
            return {'current_mb': 0, 'percent': 0, 'threshold_mb': self.memory_threshold_mb}
    
    def check_and_log_memory(self, context: str = "") -> Dict[str, float]:
        """Check memory and log with context."""
        memory_stats = self.check_memory_usage()
        self.logger.info(f"💾 Memory usage {context}: {memory_stats['current_mb']:.1f}MB")
        return memory_stats
    
    def manage_memory(self) -> bool:
        """Perform memory management if needed. Returns True if cleanup was performed."""
        try:
            self._operation_count += 1
            
            # Check memory every gc_interval operations
            if self._operation_count % self.gc_interval == 0:
                memory_stats = self.check_memory_usage()
                
                # Force garbage collection if memory usage is high
                if memory_stats['current_mb'] > self.memory_threshold_mb * self.warning_threshold:
                    self.logger.info(f"🧹 Running garbage collection (memory: {memory_stats['current_mb']:.1f}MB)")
                    
                    # Record before cleanup
                    before_memory = memory_stats['current_mb']
                    
                    # Perform garbage collection
                    gc.collect()
                    
                    # Check memory again after GC
                    new_memory = self.check_memory_usage()
                    freed_mb = before_memory - new_memory['current_mb']
                    
                    if freed_mb > 0:
                        self.logger.info(f"✅ Freed {freed_mb:.1f}MB of memory")
                    
                    return True
                        
        except Exception as e:
            self.logger.debug(f"Memory management error: {e}")
        
        return False
    
    def force_cleanup(self) -> Dict[str, float]:
        """Force immediate memory cleanup and return stats."""
        try:
            before_stats = self.check_memory_usage()
            self.logger.info("🧹 Forcing immediate garbage collection")
            
            gc.collect()
            
            after_stats = self.check_memory_usage()
            freed_mb = before_stats['current_mb'] - after_stats['current_mb']
            
            if freed_mb > 0:
                self.logger.info(f"✅ Emergency cleanup freed {freed_mb:.1f}MB")
            
            return after_stats
            
        except Exception as e:
            self.logger.error(f"Error during force cleanup: {e}")
            return self.check_memory_usage()
    
    def is_memory_critical(self) -> bool:
        """Check if memory usage is at critical levels."""
        memory_stats = self.check_memory_usage()
        return memory_stats['current_mb'] > self.memory_threshold_mb
    
    def get_memory_summary(self) -> Dict[str, Any]:
        """Get comprehensive memory summary."""
        memory_stats = self.check_memory_usage()
        
        return {
            'current_mb': memory_stats['current_mb'],
            'threshold_mb': self.memory_threshold_mb,
            'usage_percent': (memory_stats['current_mb'] / self.memory_threshold_mb) * 100,
            'is_critical': self.is_memory_critical(),
            'operations_count': self._operation_count,
            'gc_interval': self.gc_interval
        }
