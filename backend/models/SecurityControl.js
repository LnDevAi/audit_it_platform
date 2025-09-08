module.exports = (sequelize, DataTypes) => {
  const SecurityControl = sequelize.define('SecurityControl', {
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
    antivirus_status: {
      type: DataTypes.ENUM('up_to_date', 'outdated', 'absent'),
      allowNull: true
    },
    antivirus_solution: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    firewall_status: {
      type: DataTypes.ENUM('configured', 'default', 'absent'),
      allowNull: true
    },
    firewall_solution: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    backup_solution: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    backup_frequency: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    backup_tested: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    patch_management: {
      type: DataTypes.ENUM('automated', 'manual', 'none'),
      allowNull: true
    },
    access_control: {
      type: DataTypes.ENUM('active_directory', 'local', 'none'),
      allowNull: true
    },
    monitoring_solution: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    incident_response_plan: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    security_training: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'security_controls',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return SecurityControl;
};
