FROM postgres:16-alpine

COPY delayed-entrypoint.sh /usr/local/bin/delayed-entrypoint.sh

COPY init.sql /docker-entrypoint-initdb.d/01-init.sql

RUN chmod +x /usr/local/bin/delayed-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/delayed-entrypoint.sh"]

CMD ["postgres"]
