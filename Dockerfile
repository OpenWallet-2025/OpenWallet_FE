FROM nginx:latest

# 정적 폴더 생성
RUN mkdir -p /usr/share/nginx/html/css \
    && mkdir -p /usr/share/nginx/html/js

# 로그인 화면 파일
COPY login.html /usr/share/nginx/html/
COPY CSS/login.css /usr/share/nginx/html/css/
COPY Js/login.js /usr/share/nginx/html/js/

# 홈 화면 파일
COPY CSS/styles.css /usr/share/nginx/html/css/
COPY Js/app.js /usr/share/nginx/html/js/
COPY index.html /usr/share/nginx/html/
