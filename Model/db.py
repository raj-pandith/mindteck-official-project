from pymongo import MongoClient

MONGO_URI = "mongodb+srv://helloworld:HelloWorld123$@cluster0.3qqf88m.mongodb.net/"

client = MongoClient(MONGO_URI)

db = client["ecg_db"]

collection = db["ecg_signals"]

windows_collection = db["ecg_windows"]