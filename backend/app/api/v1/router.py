from fastapi import APIRouter

router = APIRouter()
api_router = APIRouter()


@router.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}


api_router.include_router(router)
