FROM nginx:latest

COPY login.html /static/
COPY login.css /static/css/
COPY login.js /static/js

COPY ./HomeScreen/HomeScreen.html /static/
COPY ./HomeScreen/HomeScreen.html /static/
COPY ./HomeScreen/HomeScreen.html /static/