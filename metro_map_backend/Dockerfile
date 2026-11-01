FROM python:3.12-slim

WORKDIR /app

# Requirements are copies so that they are cached until they are changed
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]