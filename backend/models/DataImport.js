const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DataImport = sequelize.define('DataImport', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organizations',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    file_size: {
      type: DataTypes.BIGINT
    },
    file_type: {
      type: DataTypes.ENUM('excel', 'csv', 'json', 'xml'),
      allowNull: false
    },
    import_type: {
      type: DataTypes.ENUM('inventory', 'network_devices', 'vulnerabilities', 'users', 'missions'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    total_records: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    processed_records: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    success_records: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    error_records: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    error_log: {
      type: DataTypes.TEXT
    },
    mapping_config: {
      type: DataTypes.JSON
    }
  }, {
    tableName: 'data_imports',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['organization_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['import_type']
      }
    ]
  });

  // Méthodes d'instance
  DataImport.prototype.getProgress = function() {
    if (this.total_records === 0) return 0;
    return Math.round((this.processed_records / this.total_records) * 100);
  };

  DataImport.prototype.getSuccessRate = function() {
    if (this.processed_records === 0) return 0;
    return Math.round((this.success_records / this.processed_records) * 100);
  };

  return DataImport;
};
