
-- Complete brand preload for all device categories (India market)
-- Skip if value already exists for this master_type

INSERT INTO master_data (id, master_type, value, is_active, sort_order, created_by, created_at, updated_at)
SELECT
  'md_' || gen_random_uuid(),
  s.master_type,
  s.value,
  true,
  s.sort_order,
  'system',
  now(),
  now()
FROM (VALUES
  -- COMPUTERS
  ('brand','Dell',1),('brand','HP',2),('brand','Lenovo',3),('brand','Acer',4),
  ('brand','ASUS',5),('brand','MSI',6),('brand','Apple',7),('brand','Samsung',8),
  ('brand','LG',9),('brand','Microsoft',10),('brand','Intel NUC',11),
  -- SERVERS
  ('brand','HPE',12),('brand','IBM',13),('brand','Cisco UCS',14),
  ('brand','Supermicro',15),('brand','Fujitsu',16),
  -- NETWORKING
  ('brand','Cisco',17),('brand','D-Link',18),('brand','TP-Link',19),
  ('brand','Netgear',20),('brand','MikroTik',21),('brand','Ubiquiti',22),
  ('brand','Aruba',23),('brand','Ruijie',24),('brand','Juniper',25),
  -- FIREWALLS
  ('brand','Sophos',26),('brand','Fortinet',27),('brand','WatchGuard',28),
  ('brand','SonicWall',29),('brand','Palo Alto',30),('brand','Checkpoint',31),
  -- STORAGE
  ('brand','Synology',32),('brand','QNAP',33),('brand','Western Digital',34),
  ('brand','Seagate',35),('brand','Dell EMC',36),('brand','NetApp',37),
  -- CCTV
  ('brand','Hikvision',38),('brand','Dahua',39),('brand','CP Plus',40),
  ('brand','UNV',41),('brand','Axis',42),('brand','Bosch',43),
  ('brand','Honeywell',44),('brand','Panasonic',45),('brand','Ezviz',46),
  -- PRINTERS
  ('brand','Canon',47),('brand','Brother',48),('brand','Epson',49),
  ('brand','Ricoh',50),('brand','Kyocera',51),('brand','Xerox',52),
  -- ATTENDANCE
  ('brand','eSSL',53),('brand','ZKTeco',54),('brand','Matrix',55),
  ('brand','Realtime',56),
  -- INTERCOM
  ('brand','NEC',57),('brand','Grandstream',58),('brand','Fanvil',59),
  ('brand','Yealink',60),
  -- Monitor sizes
  ('monitor_size','15"',1),('monitor_size','17"',2),('monitor_size','18.5"',3),
  ('monitor_size','19"',4),('monitor_size','21.5"',5),('monitor_size','22"',6),
  ('monitor_size','24"',7),('monitor_size','27"',8),('monitor_size','32"',9),
  ('monitor_size','43"',10),('monitor_size','49"',11),('monitor_size','55"',12),
  -- Screen sizes (laptop)
  ('screen_size','11.6"',1),('screen_size','12"',2),('screen_size','13.3"',3),
  ('screen_size','14"',4),('screen_size','15.6"',5),('screen_size','16"',6),
  ('screen_size','17.3"',7),
  -- OS Types
  ('os_type','Windows 10',1),('os_type','Windows 11',2),('os_type','Windows Server 2019',3),
  ('os_type','Windows Server 2022',4),('os_type','Ubuntu Server 22.04',5),
  ('os_type','Ubuntu 22.04',6),('os_type','CentOS 7',7),('os_type','RHEL 8',8),
  ('os_type','macOS Ventura',9),('os_type','macOS Sonoma',10),
  ('os_type','ESXi 8.0',11),('os_type','Proxmox VE',12),
  -- Processor brands
  ('processor_brand','Intel',1),('processor_brand','AMD',2),('processor_brand','Apple Silicon',3),
  -- RAM types
  ('ram_type','DDR4',1),('ram_type','DDR5',2),('ram_type','DDR3',3),
  ('ram_type','ECC DDR4',4),('ram_type','ECC DDR5',5),('ram_type','LPDDR5',6),
  -- Storage types
  ('storage_type','SSD NVMe',1),('storage_type','SSD SATA',2),('storage_type','HDD SATA',3),
  ('storage_type','HDD SAS',4),('storage_type','eMMC',5),
  -- Warranty providers (India)
  ('warranty_provider','Dell Warranty',1),('warranty_provider','HP Care Pack',2),
  ('warranty_provider','Lenovo Warranty',3),('warranty_provider','On-site Warranty',4),
  ('warranty_provider','AMC',5),('warranty_provider','NBD Warranty',6),
  -- License types
  ('license_type','OEM',1),('license_type','Retail',2),('license_type','Volume',3),
  ('license_type','Subscription',4),('license_type','Open Source',5),
  ('license_type','Freeware',6)
) AS s(master_type, value, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM master_data m
  WHERE m.master_type = s.master_type AND m.value = s.value
);
