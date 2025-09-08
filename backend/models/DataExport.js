const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DataExport = sequelize.define('DataExport', {
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
    export_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    export_type: {
      type: DataTypes.ENUM('inventory', 'missions', 'vulnerabilities', 'reports', 'full_audit'),
      allowNull: false
    },
    file_format: {
      type: DataTypes.ENUM('excel', 'csv', 'json', 'pdf', 'word'),
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING(500)
    },
    file_size: {
      type: DataTypes.BIGINT
    },
    filters: {
      type: DataTypes.JSON
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    download_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    expires_at: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'data_exports',
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
        fields: ['expires_at']
      }
    ]
  });

  // Méthodes d'instance
  DataExport.prototype.isExpired = function() {
    return this.expires_at && new Date() > new Date(this.expires_at);
  };

  DataExport.prototype.canDownload = function() {
    return this.status === 'completed' && !this.isExpired();
  };

  return DataExport;
};
