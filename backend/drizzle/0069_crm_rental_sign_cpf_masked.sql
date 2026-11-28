ALTER TABLE "crm_rental_sign_requests"
  ADD COLUMN IF NOT EXISTS "signer_cpf_masked" varchar(20);