
from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .db.base import Base
from .db.session import engine
from .models.document import Document
from .api.documents import router as documents_router

from .models.subject import Subject
from .models.topic import Topic
from .models.concept import Concept
from .models.source_reference import SourceReference
from .models.tutor import ConceptProgress, TutorMessage
from .api.knowledge import router as knowledge_router
from .api.tutor import router as tutor_router

from fastapi.middleware.cors import CORSMiddleware

# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Infinite Knowledge API",
    description="AI-powered study and knowledge roadmap system",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(documents_router)
app.include_router(knowledge_router)
app.include_router(tutor_router)


@app.get("/")
def root():
    return {
        "message": "Infinite Knowledge API is running",
        "version": "0.1.0",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/health/database")
def database_health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "connected",
            "database": "infinite_knowledge",
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed",
        )
