BEGIN;

CREATE TABLE IF NOT EXISTS kcca_properties (
  object_id       bigint PRIMARY KEY,
  camv_id         bigint,
  serial_no       text,
  house_number    text,
  frontage        text,
  property_name   text,
  division        text,
  parish          text,
  village         text,
  street          text,
  payment_status  text,
  expiry_date     date,
  latitude        numeric(10,7),
  longitude       numeric(10,7),
  raw             jsonb,
  imported_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kcca_division_idx  ON kcca_properties (division);
CREATE INDEX IF NOT EXISTS kcca_parish_idx    ON kcca_properties (parish);
CREATE INDEX IF NOT EXISTS kcca_village_idx   ON kcca_properties (village);
CREATE INDEX IF NOT EXISTS kcca_latlng_idx    ON kcca_properties (latitude, longitude);

COMMIT;
