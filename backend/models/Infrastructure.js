module.exports = (sequelize, DataTypes) => {
  const Infrastructure = sequelize.define('Infrastructure', {
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
    power_source_sonabel: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    power_source_private: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    power_source_solar: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    power_source_hybrid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    power_quality: {
      type: DataTypes.ENUM('stable', 'frequent_cuts', 'voltage_variations'),
      allowNull: true
    },
    ups_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    ups_capacity: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    generator_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    generator_capacity: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    cooling_system: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    server_room_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    server_room_secured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    network_cabinet_secured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'infrastructure',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Infrastructure;
};
