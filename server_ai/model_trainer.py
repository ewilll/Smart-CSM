import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
import os

def train_model():
    # Force absolute paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, 'dataset.csv')
    model_path = os.path.join(base_dir, 'water_intent_model.joblib')

    # Load dataset
    if not os.path.exists(dataset_path):
        print(f"Error: {dataset_path} not found!")
        return
        
    df = pd.read_csv(dataset_path).dropna()
    
    # Create a pipeline: Vectorizer -> Classifier
    # ngram_range=(1, 2) helps capture phrases like "no water"
    model = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2))),
        ('clf', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    # Train
    print("Training model...")
    model.fit(df['text'], df['intent'])
    
    # Save model
    joblib.dump(model, model_path)
    print(f"Model trained and saved as {model_path}")

if __name__ == "__main__":
    train_model()
