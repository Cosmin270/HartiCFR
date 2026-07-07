using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HartiCFR_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddLogTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Logs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SRCF = table.Column<string>(type: "text", nullable: false),
                    CT = table.Column<string>(type: "text", nullable: false),
                    TNPosition = table.Column<int>(type: "integer", nullable: false),
                    LocationType = table.Column<int>(type: "integer", nullable: false),
                    MainLine = table.Column<string>(type: "text", nullable: false),
                    ElectricType = table.Column<int>(type: "integer", nullable: false),
                    ConfigType = table.Column<int>(type: "integer", nullable: false),
                    Producer = table.Column<int>(type: "integer", nullable: false),
                    OperatingMode = table.Column<int>(type: "integer", nullable: false),
                    Location_end = table.Column<string>(type: "text", nullable: false),
                    Location_start = table.Column<string>(type: "text", nullable: false),
                    Position_x = table.Column<int>(type: "integer", nullable: false),
                    Position_y = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Logs", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Logs");
        }
    }
}
