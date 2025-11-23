FROM nginx:latest

COPY login.html /static/
COPY login.css /static/css/
COPY login.js /static/js

COPY ./HomeScreen/HomeScreen.css /static/css
COPY ./HomeScreen/HomeScreen.js /static/js
COPY ./HomeScreen/HomeScreen.html /static/