# Design

## Decisions

- **D1. `delete_my_account()`**: `SECURITY DEFINER`, `search_path=''`, `DELETE FROM auth.users WHERE id = auth.uid()`; si `auth.uid()` es NULL lanza `not_authenticated`. Los datos caen en cascada (`profiles` → resto). Solo `authenticated` puede ejecutarla. Evita usar la service role key en la app.
- **D2. Reautenticación**: antes de llamar a la función, el cliente (Server Action en web, móvil directo) verifica la contraseña con `signInWithPassword` sobre el email de la sesión. Mitiga el borrado desde una sesión robada/abierta.
- **D3. Exportación**: Route Handler `GET /api/export?format=json|csv` con el cliente de servidor (RLS) y `Content-Disposition: attachment`. CSV con `toCsv` de `@fin/shared` (separador `;`, BOM UTF-8 para Excel, escape de comillas y prefijo `'` ante `= + - @`, tabulador y retorno de carro). Los importes numéricos se emiten como número, no como texto.
- **D4. Móvil**: el borrado se hace en la app; la exportación abre `EXPO_PUBLIC_WEB_URL/profile` (descargar ficheros en móvil queda fuera).
