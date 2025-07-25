from atproto import Client
from typing import List, Optional, Dict, Any
from atproto_client.models.app.bsky.actor.defs import ProfileView
from atproto_client.models.app.bsky.feed.defs import PostView
class AccountService:
    def __init__(self, client: Client):
        self.client = client
        
    def login(self, handle: str, password: str) -> None:
        try:
            self.client.login(handle, password)
        except Exception as err:
            print(f"Error while logging in: {err}")
            raise err

    def get_following(self, actor_handle: str) -> List[ProfileView]:
        res =  self.client.get_follows(actor=actor_handle)
        if not res:
            raise Exception("Error while getting following")
        return res.follows

    async def get_followers_count(self, account) -> int:
        try:
            res = await self.client.get_profile(actor=account.handle)
            if not res:
                raise Exception("getProfile response is undefined")
            if not res.followers_count:
                raise Exception("followersCount is undefined")
            return res.followers_count
        except Exception as err:
            await self.update_account_rate_limit(account, err)
            print(f"Error while fetching followers count: {err}")

    async def update_account_rate_limit(self, account, err=None):
        if err:
            if str(err) == "Rate Limit Exceeded":
                account.is_rate_limited = True
                await account.save()
                return "skip"
        else:
            account.is_rate_limited = False
            await account.save()
            
            
    def get_profile(self, actor: str) -> Optional[ProfileView]:
        try:
            res = self.client.get_profile(actor=actor)
            if not res:
                raise Exception("getProfile response is undefined")
            return res
        except Exception as err:
            print(f"Error while getting profile: {err}")
        
    async def search_posts(self, account, query: str, cursor: Optional[str] = None) -> List[PostView]:
        try:
            res = await self.client.app.bsky.feed.search_posts(
                q=query,
                limit=100,
                cursor=cursor
            )
            if not res:
                raise Exception("searchPosts response is undefined")
            
            posts = res.data
            if not posts or len(posts) == 0:
                raise Exception("posts is undefined")
            elif posts.cursor is None:
                if cursor:
                    posts.cursor = str(int(cursor) - int(cursor))
                else:
                    raise Exception("cursor is undefined")
            
            await self.update_account_rate_limit(account)
            return posts
        except Exception as err:
            print("error while searching posts", err)
            
    async def get_account_did(self) -> str:
        return self.client.did

    def get_profiles_batch(self, actors: List[str]) -> List[Dict[str, Any]]:
        """
        Get multiple profiles in a single API call using app.bsky.actor.getProfiles.
        
        Args:
            actors: List of DIDs or handles
            
        Returns:
            List of profile dictionaries
        """
        try:
            # Limit to 25 actors per batch (API limitation)
            batch_size = 25
            all_profiles = []
            
            for i in range(0, len(actors), batch_size):
                batch = actors[i:i + batch_size]
                res = self.client.app.bsky.actor.get_profiles({"actors": batch})
                if res and res.profiles:
                    all_profiles.extend(res.profiles)
            
            return all_profiles
        except Exception as e:
            print(f"Error while getting profiles batch: {e}")
            return []

    def get_profile_data(self, did: str) -> tuple[List[ProfileView], List[Dict[str, Any]]]:
        """
        Récupère les données de profil d'un utilisateur, incluant ses follows et ses posts.
        
        Args:
            did (str): L'identifiant DID de l'utilisateur
            
        Returns:
            tuple[List[Dict[str, Any]], List[Dict[str, Any]]]: Un tuple contenant:
                - Liste des follows de l'utilisateur
                - Liste des posts de l'utilisateur
        """
        try:
            # Récupération des follows
            follows = self.get_following(did)

            # Récupération des posts
            posts_response = self.client.app.bsky.feed.get_author_feed({"actor": did})
            posts = posts_response.feed if posts_response else []

            return follows, posts
        except Exception as e:
            print(f"Error while getting profile data for {did}: {e}")
            return [], []
            
    def get_author_feed(self, actor: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get posts from an author's feed.
        
        Args:
            actor: DID or handle of the author
            limit: Maximum number of posts to return
            
        Returns:
            List of post dictionaries
        """
        try:
            res = self.client.app.bsky.feed.get_author_feed({
                "actor": actor,
                "limit": limit
            })
            if res and res.feed:
                return res.feed
            return []
        except Exception as e:
            print(f"Error while getting author feed for {actor}: {e}")
            return []
    
    def get_followers(self, actor_handle: str, limit: int = 100) -> List[ProfileView]:
        """
        Fetch up to `limit` followers for the given actor handle.
        """
        try:
            res = self.client.get_followers(actor=actor_handle, limit=limit)
            if not res:
                raise Exception("Error while getting followers")
            return res.followers
        except Exception as err:
            print(f"Error while getting followers: {err}")
            return []