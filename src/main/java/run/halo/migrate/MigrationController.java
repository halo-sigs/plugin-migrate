package run.halo.migrate;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springdoc.webflux.core.fn.SpringdocRouteBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.http.codec.multipart.Part;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.BodyExtractors;
import org.springframework.web.reactive.function.server.*;
import org.springframework.web.server.ServerWebInputException;
import reactor.core.publisher.Mono;
import run.halo.app.core.extension.Plugin;
import run.halo.app.core.extension.endpoint.PluginEndpoint;
import run.halo.app.extension.GroupVersion;
import run.halo.app.infra.utils.JsonUtils;
import run.halo.app.plugin.ApiVersion;

import java.awt.print.Book;
import java.io.IOException;
import java.io.InputStream;

import static org.springdoc.core.fn.builders.apiresponse.Builder.responseBuilder;
import static org.springdoc.core.fn.builders.content.Builder.contentBuilder;
import static org.springdoc.core.fn.builders.requestbody.Builder.requestBodyBuilder;
import static org.springdoc.core.fn.builders.schema.Builder.schemaBuilder;
import static org.springframework.web.reactive.function.server.RequestPredicates.contentType;
import static run.halo.app.infra.utils.DataBufferUtils.toInputStream;

/**
 * @author guqing
 * @since 2.0.0
 */
@ApiVersion("v1alpha1")
@RestController
@RequestMapping("/migrations")
public class MigrationController {

    @ApiResponse(responseCode = "200", description = "Import successfully.", content = {
            @Content(mediaType = "application/json",
                    schema = @Schema(implementation = JsonNode.class))
    })
    @Operation(operationId = "ImportMigrationData", description = "Import migration data file.")
    @PostMapping(value = "import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    Mono<ResponseEntity<JsonNode>> importData(@RequestPart("file") Mono<FilePart> file) {
        return file.map(filePart -> {
                    if (!filePart.filename().endsWith(".json")) {
                        throw new ServerWebInputException("File must be json format.");
                    }
                    return filePart;
                })
                .map(filePart -> {
                    try {
                        InputStream inputStream = toInputStream(filePart.content());
                        return JsonUtils.DEFAULT_JSON_MAPPER.readValue(inputStream, JsonNode.class);
                    } catch (IOException e) {
                        throw new RuntimeException(e);
                    }
                })
                .map(migrationData -> ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(migrationData));
    }
}
