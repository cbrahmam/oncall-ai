# Update main.py to properly disable docs in production
# Replace the FastAPI app creation section with:

app = FastAPI(
    title="OffCall AI - Enterprise Edition",
    description="AI-powered incident response with enterprise SSO and security",
    version="2.0.0",
    lifespan=lifespan,
    # CRITICAL: Disable docs in production
    docs_url=None,  # Always disabled in production
    redoc_url=None, # Always disabled in production  
    openapi_url=None  # Always disabled in production
)
