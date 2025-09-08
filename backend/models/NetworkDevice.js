module.exports = (sequelize, DataTypes) => {
  const NetworkDevice = sequelize.define('NetworkDevice', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    site_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'audit_sites',
        key: 'id'
      }
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: false,
      validate: {
        isIP: true
      }
    },
    hostname: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    device_type: {
      type: DataTypes.ENUM('router', 'switch', 'firewall', 'server', 'printer', 'access_point', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown'
    },
    manufacturer: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    model: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    mac_address: {
      type: DataTypes.STRING(17),
      allowNull: true,
      validate: {
        is: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
      }
    },
    services: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('services');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('services', JSON.stringify(value));
      }
    },
    ports_open: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('ports_open');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('ports_open', JSON.stringify(value));
      }
    },
    os_detected: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'unreachable'),
      defaultValue: 'active'
    },
    last_seen: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    scan_method: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    tableName: 'network_devices',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['ip_address']
      },
      {
        fields: ['site_id', 'device_type']
      }
    ]
  });

  return NetworkDevice;
};
