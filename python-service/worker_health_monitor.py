#!/usr/bin/env python3
"""
Worker Health Monitor - Monitor Python worker process stability
"""

import asyncio
import psutil
import time
import logging
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class WorkerHealthMonitor:
    """Monitor the health of the Python worker process"""
    
    def __init__(self, process_name: str = "analysis_worker.py"):
        self.process_name = process_name
        self.memory_threshold_mb = 2048  # 2GB
        self.cpu_threshold_percent = 80  # 80%
        self.monitoring_interval = 30  # 30 seconds
        
    def find_worker_processes(self) -> List[psutil.Process]:
        """Find running worker processes"""
        workers = []
        
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
                if self.process_name in cmdline:
                    workers.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        return workers
    
    def get_process_stats(self, process: psutil.Process) -> Dict:
        """Get detailed process statistics"""
        try:
            memory_info = process.memory_info()
            return {
                'pid': process.pid,
                'memory_mb': memory_info.rss / 1024 / 1024,
                'memory_percent': process.memory_percent(),
                'cpu_percent': process.cpu_percent(),
                'status': process.status(),
                'create_time': process.create_time(),
                'num_threads': process.num_threads(),
                'connections': len(process.connections()) if hasattr(process, 'connections') else 0
            }
        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
            return {'error': str(e)}
    
    def check_process_health(self, stats: Dict) -> Dict:
        """Check if process is healthy"""
        health_status = {
            'healthy': True,
            'issues': [],
            'warnings': []
        }
        
        # Check memory usage
        if stats.get('memory_mb', 0) > self.memory_threshold_mb:
            health_status['healthy'] = False
            health_status['issues'].append(f"High memory usage: {stats['memory_mb']:.1f}MB (limit: {self.memory_threshold_mb}MB)")
        elif stats.get('memory_mb', 0) > self.memory_threshold_mb * 0.8:
            health_status['warnings'].append(f"Approaching memory limit: {stats['memory_mb']:.1f}MB")
        
        # Check CPU usage
        if stats.get('cpu_percent', 0) > self.cpu_threshold_percent:
            health_status['healthy'] = False
            health_status['issues'].append(f"High CPU usage: {stats['cpu_percent']:.1f}% (limit: {self.cpu_threshold_percent}%)")
        elif stats.get('cpu_percent', 0) > self.cpu_threshold_percent * 0.8:
            health_status['warnings'].append(f"High CPU usage: {stats['cpu_percent']:.1f}%")
        
        # Check process status
        if stats.get('status') in ['zombie', 'stopped']:
            health_status['healthy'] = False
            health_status['issues'].append(f"Process in bad state: {stats['status']}")
        
        return health_status
    
    async def monitor_loop(self):
        """Main monitoring loop"""
        logger.info(f"🔍 Starting worker health monitoring for '{self.process_name}'")
        logger.info(f"📊 Thresholds: Memory {self.memory_threshold_mb}MB, CPU {self.cpu_threshold_percent}%")
        
        consecutive_no_process = 0
        
        while True:
            try:
                workers = self.find_worker_processes()
                
                if not workers:
                    consecutive_no_process += 1
                    if consecutive_no_process == 1:
                        logger.warning(f"⚠️ No worker processes found matching '{self.process_name}'")
                    elif consecutive_no_process >= 5:
                        logger.error(f"❌ Worker process missing for {consecutive_no_process * self.monitoring_interval} seconds")
                else:
                    consecutive_no_process = 0
                    
                    for worker in workers:
                        stats = self.get_process_stats(worker)
                        
                        if 'error' in stats:
                            logger.error(f"❌ Error getting stats for PID {worker.pid}: {stats['error']}")
                            continue
                        
                        health = self.check_process_health(stats)
                        uptime_hours = (time.time() - stats['create_time']) / 3600
                        
                        # Log process status
                        status_emoji = "✅" if health['healthy'] else "❌"
                        logger.info(f"{status_emoji} PID {stats['pid']}: "
                                  f"Memory {stats['memory_mb']:.1f}MB ({stats['memory_percent']:.1f}%), "
                                  f"CPU {stats['cpu_percent']:.1f}%, "
                                  f"Uptime {uptime_hours:.1f}h, "
                                  f"Threads {stats['num_threads']}")
                        
                        # Log warnings
                        for warning in health['warnings']:
                            logger.warning(f"⚠️ PID {stats['pid']}: {warning}")
                        
                        # Log issues
                        for issue in health['issues']:
                            logger.error(f"❌ PID {stats['pid']}: {issue}")
                        
                        # Log overall health
                        if not health['healthy']:
                            logger.error(f"🚨 Worker PID {stats['pid']} is UNHEALTHY!")
                
                await asyncio.sleep(self.monitoring_interval)
                
            except KeyboardInterrupt:
                logger.info("🛑 Monitoring stopped by user")
                break
            except Exception as e:
                logger.error(f"❌ Error in monitoring loop: {e}")
                await asyncio.sleep(self.monitoring_interval)

async def main():
    """Main function"""
    monitor = WorkerHealthMonitor()
    await monitor.monitor_loop()

if __name__ == "__main__":
    print("🔍 Python Worker Health Monitor")
    print("=" * 50)
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Monitor stopped")
