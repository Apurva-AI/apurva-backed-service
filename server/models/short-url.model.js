import { DataTypes } from "sequelize";

/**
 * Short URL Schema Schema
 */
export default {
  name: "short_url",
  attribute: {
    urlId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    originalURL: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    shortURL: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
};
