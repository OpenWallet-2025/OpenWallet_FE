FROM nginx:latest

# 정적 폴더 생성
RUN mkdir -p /usr/share/nginx/html/CSS \
    && mkdir -p /usr/share/nginx/html/Js \
    && mkdir -p /usr/share/nginx/html/assets \
    && mkdir -p /usr/share/nginx/html/img

COPY *.html /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY img/ /usr/share/nginx/html/img/
COPY CSS/ /usr/share/nginx/html/CSS/
COPY Js/ /usr/share/nginx/html/Js/



