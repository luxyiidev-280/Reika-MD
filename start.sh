#!/bin/bash
while true
 do
  clear
  echo -e "\033[36mREIKA-MD ❄️ INICIANDO...\033[0m"
  node --no-warnings --expose-gc main.js "$1"
  echo -e "\033[33mProcesso finalizado. Reiniciando em 3s...\033[0m"
  sleep 3
done
