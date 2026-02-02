#!/bin/bash
# Configurar timezone do MySQL
mysql -uroot -p'@Misael21' -e "SET GLOBAL time_zone = 'America/Sao_Paulo';"
mysql -uroot -p'@Misael21' -e "SELECT NOW() as 'MySQL Time';"
echo "Timezone do MySQL configurado para America/Sao_Paulo"
