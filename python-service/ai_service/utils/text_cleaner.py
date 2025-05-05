import re
import unicodedata
import spacy
from typing import Union, List, Optional

class TextCleaner:
    """
    Classe utilitaire pour le nettoyage et le prétraitement des textes
    """
    
    def __init__(self, language: str = "en"):
        """
        Initialise le nettoyeur de texte
        
        Args:
            language: Code de langue pour le modèle spaCy (par défaut: anglais)
        """
        self.nlp = spacy.blank(language)
        
        # Compilation des expressions régulières
        self.url_pattern = re.compile(r'http\S+|www\.\S+')
        self.mention_pattern = re.compile(r'@\w+')
        self.hashtag_pattern = re.compile(r'#\w+')
    
    def clean(self, texts: Union[str, List[str]], aggressive: bool = False) -> Union[str, List[str], None]:
        """
        Nettoie un texte ou une liste de textes
        
        Args:
            texts: Le texte ou la liste de textes à nettoyer
            aggressive: Si True, applique un nettoyage plus agressif (stopwords, chiffres)
            
        Returns:
            Le texte nettoyé ou une liste de textes nettoyés
        """
        if isinstance(texts, str):
            return self._clean_single(texts, aggressive)
        elif isinstance(texts, list):
            cleaned_list = []
            for text in texts:
                if text is None:
                    continue
                cleaned = self._clean_single(text, aggressive)
                if cleaned:  # On garde seulement les textes valides
                    cleaned_list.append(cleaned)
            return cleaned_list
        else:
            raise ValueError("Input must be a string or list of strings.")
    
    def _clean_single(self, text: str, aggressive: bool = False) -> Optional[str]:
        """
        Nettoie un texte individuel
        
        Args:
            text: Le texte à nettoyer
            aggressive: Si True, applique un nettoyage plus agressif
            
        Returns:
            Le texte nettoyé ou None si le texte est trop court après nettoyage
        """
        # Suppression des URLs et mentions
        text = self.url_pattern.sub('', text)
        text = self.mention_pattern.sub('', text)
        
        # Normalisation des accents
        text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
        
        # Tokenizer via spaCy
        doc = self.nlp(text)
        
        cleaned_tokens = []
        for token in doc:
            if token.is_space:
                continue
            if token.is_punct:
                continue
            if token.like_url or token.like_email:
                continue
            if aggressive and (token.is_stop or token.is_digit):
                continue
            cleaned_tokens.append(token.text)
        
        cleaned_text = " ".join(cleaned_tokens).lower().strip()
        
        # Filtrer les textes trop courts
        if len(cleaned_text.split()) < 3:
            return None
        
        return cleaned_text