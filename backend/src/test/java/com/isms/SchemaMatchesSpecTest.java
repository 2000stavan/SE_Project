package com.isms;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.sql.DataSource;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.*;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class SchemaMatchesSpecTest {

    @Autowired
    private DataSource dataSource;

    @Test
    @DisplayName("Verify database schema matches schema.md specifications exactly")
    void testSchemaMatchesSpec() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        InputStream is = getClass().getResourceAsStream("/expected-schema.json");
        JsonNode root = mapper.readTree(is);

        List<String> expectedTables = new ArrayList<>();
        root.get("tables").forEach(t -> expectedTables.add(t.asText()));

        Map<String, Set<String>> expectedColumns = new HashMap<>();
        JsonNode columnsNode = root.get("columns");
        Iterator<String> tableNames = columnsNode.fieldNames();
        while (tableNames.hasNext()) {
            String table = tableNames.next();
            Set<String> cols = new HashSet<>();
            columnsNode.get(table).forEach(c -> cols.add(c.asText().toLowerCase()));
            expectedColumns.put(table.toLowerCase(), cols);
        }

        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData metaData = conn.getMetaData();

            // Check tables exist
            for (String expectedTable : expectedTables) {
                try (ResultSet rs = metaData.getTables(null, null, expectedTable, new String[]{"TABLE"})) {
                    boolean found = rs.next();
                    assertTrue(found, "Expected table missing from database: " + expectedTable);
                }

                // Check columns exist
                Set<String> actualCols = new HashSet<>();
                try (ResultSet rs = metaData.getColumns(null, null, expectedTable, "%")) {
                    while (rs.next()) {
                        actualCols.add(rs.getString("COLUMN_NAME").toLowerCase());
                    }
                }

                Set<String> requiredCols = expectedColumns.get(expectedTable.toLowerCase());
                for (String col : requiredCols) {
                    assertTrue(actualCols.contains(col),
                            "Table '" + expectedTable + "' is missing expected column: " + col + ". Found: " + actualCols);
                }
            }
        }
    }
}
