
# Use official Python image
FROM python:3.11-slim

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir flask flask-cors flask-sqlalchemy flask-migrate requests werkzeug

EXPOSE 5000

CMD ["python", "app.py"]

