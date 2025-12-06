FROM nginx:latest

RUN mkdir -p /usr/share/nginx/html/CSS \
    && mkdir -p /usr/share/nginx/html/Js \
    && mkdir -p /usr/share/nginx/html/assets \
    && mkdir -p /usr/share/nginx/html/img

COPY *.html /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY CSS/ /usr/share/nginx/html/CSS/
COPY Js/ /usr/share/nginx/html/Js/