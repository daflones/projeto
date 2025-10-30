# Como Testar o Código PIX

## 1. Validador Online
Acesse: https://pix.nascent.com.br/tools/pix-qr-decoder/

Cole o código PIX gerado e veja se ele é válido.

## 2. Estrutura Esperada do Código PIX

Um código PIX válido deve ter esta estrutura:

```
00020126... (inicia sempre com 000201)
26[tamanho][conteúdo do campo 26]
52[tamanho]0000
53[tamanho]986
54[tamanho][valor]
58[tamanho]BR
59[tamanho][nome]
60[tamanho][cidade]
62[tamanho][dados adicionais]
6304[CRC16]
```

## 3. Exemplo de Código PIX Válido

```
00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5913NOME COMPLETO6009SAO PAULO62070503***6304XXXX
```

## 4. Problemas Comuns

- **Chave PIX com caracteres inválidos**: Chaves UUID devem ter hífens
- **Nome/Cidade com acentos**: Deve ser normalizado (sem acentos)
- **Valor mal formatado**: Deve ter 2 casas decimais (ex: 10.00, não 10)
- **CRC16 incorreto**: O hash está errado

## 5. Para Testar

1. Copie o "Payload completo" do console
2. Cole no validador online acima
3. Veja se retorna erro ou sucesso
4. Me envie o resultado
