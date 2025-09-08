module.exports = (sequelize, DataTypes) => {
  const Scan = sequelize.define('Scan', {
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
    scan_type: {
      type: DataTypes.ENUM('network_discovery', 'port_scan', 'vulnerability_scan', 'web_scan'),
      allowNull: false
    },
    tool_used: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    target_range: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    start_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('running', 'completed', 'failed', 'cancelled'),
      defaultValue: 'running'
    },
    results_summary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    devices_found: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    vulnerabilities_found: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    performed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'scans',
    timestamps: false
  });

  return Scan;
};
