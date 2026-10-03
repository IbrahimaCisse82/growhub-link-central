ALTER TABLE public.accounting_annex_data
DROP CONSTRAINT accounting_annex_data_document_code_check;

ALTER TABLE public.accounting_annex_data
ADD CONSTRAINT accounting_annex_data_document_code_check
CHECK (document_code IN ('R1','R2','R3','R4','Note 1','Note 2','Note 8A','Note 15B','Note 16B','Note 16B bis','Note 16C','Note 27B','Note 31','Note 34','Note 35','Note 36'));