# 📚 Manual da Reika-MD

A Reika-MD é uma base em desenvolvimento. Este manual resume os sistemas principais.

---

## 1. Conexão

Inicie com:

```bash
npm start
```

O bot pode usar QR Code ou código pareado, dependendo da opção escolhida no terminal.

---

## 2. Menus

Menu principal:

```txt
!menu
```

Fallbacks:

```txt
!menu2
!menuadm
!menumemb
!menudono
```

---

## 3. Bem-vindo

O bem-vindo funciona por evento:

```txt
group-participants.update
```

O comando `!bemvindo 1` apenas liga a flag.

---

## 4. Legenda BV

Cada grupo pode ter sua própria legenda:

```txt
!legendabv texto
!legendabv status
!legendabv reset
```

Variáveis:

```txt
$user
$grupo
$membros
$bot
$footer
$data
$hora
$prefixo
```

---

## 5. Foto BV

Cada grupo pode salvar sua própria imagem:

```txt
!fotobv
!fotobv status
!fotobv reset
```

---

## 6. AntiPV3

Bloqueia comandos no privado para usuários comuns:

```txt
!antipv3 1
```

Dono e premium continuam liberados.

---

## 7. Stickers

```txt
!s
!sticker
!rename
```

O sistema usa `ffmpeg`.

---

## 8. Horários

```txt
!fechargp diario 00:00
!abrirgp diario 06:00
!horarios
!delhorario code
```

---

## 9. Aviso

A base está em desenvolvimento e pode conter falhas graves.
