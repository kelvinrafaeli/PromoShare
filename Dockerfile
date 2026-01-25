FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

# CORREÇÃO: Copia da pasta 'dist' local (na raiz) e não mais de 'site/dist'
COPY dist/ /usr/share/nginx/html/

EXPOSE 80
