# db.py
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._pool = None
        return cls._instance

    async def init(self):
        try:
            if self._pool is None:
                print("Database url",os.getenv("DATABASE_URL"))
                self._pool = await asyncpg.create_pool(
                    dsn=os.getenv("DATABASE_URL"),
                    min_size=1,
                    max_size=10,
                )
        except Exception as e:
            raise Exception("error while init database" + str(e))
            

    async def fetch(self, query, *args):
        try:
            if not self._pool:
                raise RuntimeError("Pool not initialized. Call `init()` first.")
            async with self._pool.acquire() as conn:
                return await conn.fetch(query, *args)
        except Exception as e: 
            print("error while fetching database", e)
            raise Exception("error while fetching database" + e)

    async def execute(self, query, *args):
        if not self._pool:
            raise RuntimeError("Pool not initialized. Call `init()` first.")
        async with self._pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def close(self):
        if self._pool:
            await self._pool.close()
            self._pool = None
