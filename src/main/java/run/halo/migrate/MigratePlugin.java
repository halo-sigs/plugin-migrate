package run.halo.migrate;

import org.springframework.stereotype.Component;
import run.halo.app.plugin.BasePlugin;
import run.halo.app.plugin.PluginContext;

/**
 * @author guqing
 * @since 2.0.0
 */
@Component
public class MigratePlugin extends BasePlugin {

    public MigratePlugin(PluginContext pluginContext) {
        super(pluginContext);
    }

    @Override
    public void start() {
    }

    @Override
    public void stop() {
    }
}
