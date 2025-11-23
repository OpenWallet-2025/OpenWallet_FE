FROM nginx:latest

# 정적 폴더 생성
RUN mkdir -p /usr/share/nginx/html/css \
    && mkdir -p /usr/share/nginx/html/js

# 로그인 화면 파일
COPY login.html /usr/share/nginx/html/
COPY login.css /usr/share/nginx/html/css/
COPY login.js /usr/share/nginx/html/js/

# 홈 화면 파일
COPY HomeScreen/HomeScreen.css /usr/share/nginx/html/css/
COPY HomeScreen/HomeScreen.js /usr/share/nginx/html/js/
COPY HomeScreen/HomeScreen.html /usr/share/nginx/html/
